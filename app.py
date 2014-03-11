
import logging
import os
import webapp2


class MainPage(webapp2.RequestHandler):

  def get(self):
    path = os.path.join(os.path.dirname(__file__), "index.html")
    self.response.out.write(open(path, "r").read())


app = webapp2.WSGIApplication([(r"/.*", MainPage)], debug=True)
